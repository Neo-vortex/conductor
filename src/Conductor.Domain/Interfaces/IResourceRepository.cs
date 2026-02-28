using Conductor.Domain.Models;

namespace Conductor.Domain.Interfaces;

public interface IResourceRepository
{
    Resource Find(Bucket bucket, string name);

    Resource Find(Bucket bucket, string name, int version);

    int? GetLatestVersion(Bucket bucket, string name);

    void Save(Bucket bucket, Resource resource);
}