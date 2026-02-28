using System.Collections.Generic;
using System.Linq;
using Conductor.Domain.Interfaces;
using Conductor.Domain.Models;
using Conductor.Storage.Models;
using MongoDB.Bson;
using MongoDB.Driver;
using Newtonsoft.Json;

namespace Conductor.Storage.Services;

public class DefinitionRepository : IDefinitionRepository
{
    private static bool _indexesCreated;
    private readonly IMongoDatabase _database;

    public DefinitionRepository(IMongoDatabase database)
    {
        _database = database;
        CreateIndexes(_collection);
    }

    private IMongoCollection<StoredDefinition> _collection =>
        _database.GetCollection<StoredDefinition>("Definitions");

    public Definition Find(string workflowId)
    {
        var version = GetLatestVersion(workflowId);
        if (version == null) return null;
        return Find(workflowId, version.Value);
    }

    public Definition Find(string workflowId, int version)
    {
        var result = _collection.Find(x => x.ExternalId == workflowId && x.Version == version);
        if (!result.Any()) return null;

        var json = result.First().Definition.ToJson();
        return JsonConvert.DeserializeObject<Definition>(json);
    }

    public int? GetLatestVersion(string workflowId)
    {
        var versions = _collection.AsQueryable().Where(x => x.ExternalId == workflowId);
        if (!versions.Any()) return null;
        return versions.Max(x => x.Version);
    }

    public IEnumerable<Definition> GetAll()
    {
        return _collection.AsQueryable()
            .ToList()
            .GroupBy(x => x.ExternalId)
            .Select(g => g.OrderByDescending(x => x.Version).First().Definition)
            .Select(doc => JsonConvert.DeserializeObject<Definition>(doc.ToJson()))
            .ToList();
    }

    public void Save(Definition definition)
    {
        var json = JsonConvert.SerializeObject(definition);
        var doc  = BsonDocument.Parse(json);

        if (_collection.AsQueryable().Any(x => x.ExternalId == definition.Id && x.Version == definition.Version))
        {
            _collection.ReplaceOne(
                x => x.ExternalId == definition.Id && x.Version == definition.Version,
                new StoredDefinition { ExternalId = definition.Id, Version = definition.Version, Definition = doc });
            return;
        }

        _collection.InsertOne(new StoredDefinition
            { ExternalId = definition.Id, Version = definition.Version, Definition = doc });
    }

    public void Delete(string workflowId)
    {
        _collection.DeleteMany(x => x.ExternalId == workflowId);
    }

    private static void CreateIndexes(IMongoCollection<StoredDefinition> collection)
    {
        if (_indexesCreated) return;

        collection.Indexes.CreateOne(
            Builders<StoredDefinition>.IndexKeys.Ascending(x => x.ExternalId).Ascending(x => x.Version),
            new CreateIndexOptions { Background = true, Name = "unq_definition_id_version", Unique = true });
        collection.Indexes.CreateOne(
            Builders<StoredDefinition>.IndexKeys.Ascending(x => x.ExternalId),
            new CreateIndexOptions { Background = true, Name = "idx_definition_id" });

        _indexesCreated = true;
    }
}