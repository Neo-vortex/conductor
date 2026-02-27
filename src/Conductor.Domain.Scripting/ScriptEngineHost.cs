using System.Collections.Concurrent;
using System.Dynamic;
using Conductor.Domain.Interfaces;
using Conductor.Domain.Models;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;
using Microsoft.Extensions.Logging;

namespace Conductor.Domain.Scripting;

/// <summary>
///     Roslyn-based script engine host. Replaces IronPython.
///     Expression language:  C# expressions, e.g.  data.amount * 1.1
///     Script language:      C# statements,  e.g.  result = input + 1;
///     Available globals in expressions/scripts:
///     data        – the workflow data object (dynamic ExpandoObject)
///     context     – IStepExecutionContext (expressions only)
///     environment – IDictionary of env vars
///     step        – the step body (output scripts only)
///     outcome     – outcome object (outcome expressions only)
/// </summary>
public class ScriptEngineHost : IScriptEngineHost
{
    private static readonly ScriptOptions DefaultOptions = ScriptOptions.Default
        .WithImports(
            "System",
            "System.Linq",
            "System.Collections.Generic",
            "System.Dynamic")
        .WithReferences(
            typeof(object).Assembly,
            typeof(Enumerable).Assembly,
            typeof(ExpandoObject).Assembly);

    // Cache compiled scripts keyed by source text to avoid recompiling on every step execution
    private readonly ConcurrentDictionary<string, Script<object>> _expressionCache = new();
    private readonly ILogger<ScriptEngineHost> _logger;
    private readonly ConcurrentDictionary<string, Script> _statementCache = new();

    public ScriptEngineHost(ILogger<ScriptEngineHost> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public void Execute(Resource resource, IDictionary<string, object> inputs)
    {
        if (resource.ContentType != "text/x-csharp")
            throw new NotSupportedException(
                $"Content type '{resource.ContentType}' is not supported. Use 'text/x-csharp'.");

        var globals = new ScriptGlobals(inputs);

        var script = _statementCache.GetOrAdd(resource.Content, src =>
            CSharpScript.Create(src, DefaultOptions, typeof(ScriptGlobals)));

        try
        {
            script.RunAsync(globals).GetAwaiter().GetResult();
        }
        catch (CompilationErrorException ex)
        {
            _logger.LogError(ex, "Compilation error in script resource '{Name}'", resource.Name);
            throw new InvalidOperationException($"Script compilation failed: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Runtime error in script resource '{Name}'", resource.Name);
            throw;
        }
    }

    /// <inheritdoc />
    public dynamic EvaluateExpression(string expression, IDictionary<string, object> inputs)
    {
        var globals = new ScriptGlobals(inputs);

        var script = _expressionCache.GetOrAdd(expression, expr =>
            CSharpScript.Create<object>(expr, DefaultOptions, typeof(ScriptGlobals)));

        try
        {
            return script.RunAsync(globals).GetAwaiter().GetResult().ReturnValue;
        }
        catch (CompilationErrorException ex)
        {
            _logger.LogError(ex, "Compilation error in expression: {Expression}", expression);
            throw new InvalidOperationException($"Expression compilation failed: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Runtime error in expression: {Expression}", expression);
            throw;
        }
    }

    /// <inheritdoc />
    public T EvaluateExpression<T>(string expression, IDictionary<string, object> inputs)
    {
        var result = EvaluateExpression(expression, inputs);
        if (result is T typed)
            return typed;

        return (T)Convert.ChangeType(result, typeof(T));
    }
}