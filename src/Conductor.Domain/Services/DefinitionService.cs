using System;
using Conductor.Domain.Interfaces;
using Conductor.Domain.Models;
using Microsoft.Extensions.Logging;

namespace Conductor.Domain.Services;

public class DefinitionService : IDefinitionService
{
    private readonly IClusterBackplane _backplane;
    private readonly IWorkflowLoader _loader;
    private readonly ILogger _logger;
    private readonly IDefinitionRepository _repository;
    private readonly WorkflowCore.Interface.IWorkflowRegistry _registry;

    public DefinitionService(IDefinitionRepository repository, IWorkflowLoader loader, IClusterBackplane backplane,
        WorkflowCore.Interface.IWorkflowRegistry registry, ILoggerFactory loggerFactory)
    {
        _repository = repository;
        _loader     = loader;
        _backplane  = backplane;
        _registry   = registry;
        _logger     = loggerFactory.CreateLogger(GetType());
    }

    public void LoadDefinitionsFromStorage()
    {
        foreach (var definition in _repository.GetAll())
            try
            {
                _loader.LoadDefinition(definition);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading definition {DefinitionId}", definition.Id);
            }
    }

    public void RegisterNewDefinition(Definition definition)
    {
        var version = _repository.GetLatestVersion(definition.Id) ?? 0;
        definition.Version = version + 1;
        _loader.LoadDefinition(definition);
        _repository.Save(definition);
        _backplane.LoadNewDefinition(definition.Id, definition.Version);
    }

    public void ReplaceVersion(Definition definition)
    {
        // Deregister the existing in-memory version so WorkflowCore allows re-registration
        if (_registry.IsRegistered(definition.Id, definition.Version))
            _registry.DeregisterWorkflow(definition.Id, definition.Version);

        // Re-register with WorkflowCore and persist to storage
        _loader.LoadDefinition(definition);
        _repository.Save(definition);
        _backplane.LoadNewDefinition(definition.Id, definition.Version);
    }

    public IEnumerable<Definition> GetAllDefinitions()
    {
        return _repository.GetAll();
    }

    public void DeleteDefinition(string id)
    {
        var latest = _repository.Find(id);
        if (latest != null)
            _registry.DeregisterWorkflow(id, latest.Version);

        _repository.Delete(id);
    }

    public Definition GetDefinition(string id)
    {
        return _repository.Find(id);
    }
}