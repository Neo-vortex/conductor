namespace Conductor.Domain.Scripting;

/// <summary>
///     Strongly-typed globals bag passed to every Roslyn script/expression.
///     Properties on this class become top-level variables inside the script.
///     Any extra variables from the inputs dictionary are exposed through
///     <see cref="vars" /> for backward-compat patterns.
/// </summary>
public sealed class ScriptGlobals
{
    public ScriptGlobals(IDictionary<string, object> inputs)
    {
        vars = inputs;

        if (inputs.TryGetValue("data", out var d)) data = d;
        if (inputs.TryGetValue("context", out var c)) context = c;
        if (inputs.TryGetValue("environment", out var e)) environment = e;
        if (inputs.TryGetValue("step", out var s)) step = s;
        if (inputs.TryGetValue("outcome", out var o)) outcome = o;
    }

    // Well-known names that workflow expressions and scripts can use directly
    public dynamic? data { get; set; }
    public dynamic? context { get; set; }
    public dynamic? environment { get; set; }
    public dynamic? step { get; set; }
    public dynamic? outcome { get; set; }

    /// <summary>Full variable bag — scripts can also access inputs by name via vars["key"].</summary>
    public IDictionary<string, object> vars { get; }
}