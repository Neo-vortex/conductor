using System.Collections.Generic;
using IronPython.Hosting;
using Microsoft.Scripting.Hosting;

namespace Conductor.Domain.Scripting
{
    internal class ScriptEngineFactory : IScriptEngineFactory
    {
        private readonly Dictionary<string, ScriptEngine> _engines = new Dictionary<string, ScriptEngine>
        {
            [@"text/x-python"] = Python.CreateEngine(),
            [string.Empty] = Python.CreateEngine()
        };

        public ScriptEngine GetEngine(string contentType)
        {
            return _engines[contentType];
        }

        public ScriptEngine GetExpressionEngine()
        {
            return _engines[string.Empty];
        }
    }
}