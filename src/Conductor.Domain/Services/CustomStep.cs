using Conductor.Domain.Interfaces;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace Conductor.Domain.Services;

public class CustomStep : StepBodyAsync
{
    private readonly ICustomStepService _service;

    public CustomStep(ICustomStepService service)
    {
        _service = service;
    }

    public Dictionary<string, object> _variables { get; set; } = new();

    public object this[string propertyName]
    {
        get => _variables[propertyName];
        set => _variables[propertyName] = value;
    }

    public override async Task<ExecutionResult> RunAsync(IStepExecutionContext context)
    {
        var resource = _service.GetStepResource(Convert.ToString(_variables["__custom_step__"]));

        _service.Execute(resource, _variables);
        return ExecutionResult.Next();
    }
}