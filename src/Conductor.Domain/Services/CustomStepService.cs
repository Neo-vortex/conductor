using Conductor.Domain.Interfaces;
using Conductor.Domain.Models;

namespace Conductor.Domain.Services;

public class CustomStepService : ICustomStepService
{
    private const string SupportedContentType = "text/x-csharp";

    private readonly IResourceRepository _resourceRepository;
    private readonly IScriptEngineHost _scriptHost;

    public CustomStepService(IResourceRepository resourceRepository, IScriptEngineHost scriptHost)
    {
        _resourceRepository = resourceRepository;
        _scriptHost = scriptHost;
    }

    public void SaveStepResource(Resource resource)
    {
        if (resource.ContentType != SupportedContentType)
            throw new ArgumentException(
                $"Unsupported content type '{resource.ContentType}'. Custom steps must be '{SupportedContentType}'.");

        _resourceRepository.Save(Bucket.Lambda, resource);
    }

    public Resource? GetStepResource(string name)
    {
        return _resourceRepository.Find(Bucket.Lambda, name);
    }

    public void Execute(Resource resource, IDictionary<string, object> scope)
    {
        _scriptHost.Execute(resource, scope);
    }
}