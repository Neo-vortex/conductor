using MongoDB.Bson;

namespace Conductor.Storage.Models;

public class StoredDefinition
{
    public ObjectId Id { get; set; }

    public string ExternalId { get; set; }

    public int Version { get; set; }

    public BsonDocument Definition { get; set; }
}