using System;
using System.Collections.Generic;
using System.Linq;
using WorkflowCore.Interface;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace Conductor.Domain.Services;

public class ConductorRegistry : IWorkflowRegistry
{
    private readonly List<(string WorkflowId, int Version, WorkflowDefinition WorkflowDefinition)> _registry = new();

    public void RegisterWorkflow(WorkflowDefinition definition)
    {
        if (_registry.Any(x => x.WorkflowId == definition.Id && x.Version == definition.Version))
            throw new InvalidOperationException(
                $"Workflow {definition.Id} version {definition.Version} is already registered");

        _registry.Add((definition.Id, definition.Version, definition));
    }

    public void DeregisterWorkflow(string workflowId, int version)
    {
        _registry.RemoveAll(x => x.WorkflowId == workflowId && x.Version == version);
    }

    public WorkflowDefinition GetDefinition(string workflowId, int? version = null)
    {
        if (version.HasValue)
        {
            var entry = _registry.FirstOrDefault(x => x.WorkflowId == workflowId && x.Version == version.Value);
            return entry.WorkflowDefinition;
        }

        var latest = _registry
            .Where(x => x.WorkflowId == workflowId)
            .OrderByDescending(x => x.Version)
            .FirstOrDefault();

        return latest.WorkflowDefinition;
    }

    public IEnumerable<WorkflowDefinition> GetAllDefinitions()
    {
        return _registry.Select(x => x.WorkflowDefinition);
    }

    public bool IsRegistered(string workflowId, int version)
    {
        return _registry.Any(x => x.WorkflowId == workflowId && x.Version == version);
    }

    public void RegisterWorkflow(IWorkflow workflow)
    {
        var builder = new WorkflowBuilder<object>([]);
        workflow.Build(builder);
        var definition = builder.Build(workflow.Id, workflow.Version);
        RegisterWorkflow(definition);
    }

    public void RegisterWorkflow<TData>(IWorkflow<TData> workflow) where TData : new()
    {
        var builder = new WorkflowBuilder<TData>([]);
        workflow.Build(builder);
        var definition = builder.Build(workflow.Id, workflow.Version);
        RegisterWorkflow(definition);
    }
}