using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.IdGenerators;
using MongoDB.Driver;
using WorkflowCore.Exceptions;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace Conductor.Storage.Services;

public class WorkflowPersistenceProvider : IPersistenceProvider
{
    private static bool _indexesCreated;
    private readonly IMongoDatabase _database;

    // ── BSON class maps ───────────────────────────────────────────────────
    static WorkflowPersistenceProvider()
    {
        BsonClassMap.RegisterClassMap<WorkflowInstance>(x =>
        {
            x.MapIdProperty(y => y.Id).SetIdGenerator(new StringObjectIdGenerator());
            x.MapProperty(y => y.Data);
            x.MapProperty(y => y.Description);
            x.MapProperty(y => y.Reference);
            x.MapProperty(y => y.WorkflowDefinitionId);
            x.MapProperty(y => y.Version);
            x.MapProperty(y => y.NextExecution);
            x.MapProperty(y => y.Status);
            x.MapProperty(y => y.CreateTime);
            x.MapProperty(y => y.CompleteTime);
            x.MapProperty(y => y.ExecutionPointers);
        });

        BsonClassMap.RegisterClassMap<EventSubscription>(x =>
        {
            x.MapIdProperty(y => y.Id).SetIdGenerator(new StringObjectIdGenerator());
            x.MapProperty(y => y.EventName);
            x.MapProperty(y => y.EventKey);
            x.MapProperty(y => y.StepId);
            x.MapProperty(y => y.WorkflowId);
            x.MapProperty(y => y.SubscribeAsOf);
            x.MapProperty(y => y.SubscriptionData);
            x.MapProperty(y => y.ExternalToken);
            x.MapProperty(y => y.ExternalWorkerId);
            x.MapProperty(y => y.ExternalTokenExpiry);
            x.MapProperty(y => y.ExecutionPointerId);
        });

        BsonClassMap.RegisterClassMap<Event>(x =>
        {
            x.MapIdProperty(y => y.Id).SetIdGenerator(new StringObjectIdGenerator());
            x.MapProperty(y => y.EventName);
            x.MapProperty(y => y.EventKey);
            x.MapProperty(y => y.EventData);
            x.MapProperty(y => y.EventTime);
            x.MapProperty(y => y.IsProcessed);
        });

        BsonClassMap.RegisterClassMap<ScheduledCommand>(x => x.AutoMap());
        BsonClassMap.RegisterClassMap<ControlPersistenceData>(x => x.AutoMap());
        BsonClassMap.RegisterClassMap<SchedulePersistenceData>(x => x.AutoMap());
        BsonClassMap.RegisterClassMap<ExecutionPointer>(x => x.AutoMap());
        BsonClassMap.RegisterClassMap<ActivityResult>(x => x.AutoMap());
    }

    public WorkflowPersistenceProvider(IMongoDatabase database)
    {
        _database = database;
        EnsureIndexes();
    }

    // ── collections ───────────────────────────────────────────────────────
    private IMongoCollection<WorkflowInstance>  WorkflowInstances  => _database.GetCollection<WorkflowInstance>("Workflows");
    private IMongoCollection<EventSubscription> EventSubscriptions => _database.GetCollection<EventSubscription>("Subscriptions");
    private IMongoCollection<Event>             Events             => _database.GetCollection<Event>("Events");
    private IMongoCollection<ExecutionError>    ExecutionErrors    => _database.GetCollection<ExecutionError>("ExecutionErrors");
    private IMongoCollection<ScheduledCommand>  ScheduledCommands  => _database.GetCollection<ScheduledCommand>("ScheduledCommands");

    // ── IWorkflowRepository ───────────────────────────────────────────────
    public async Task<string> CreateNewWorkflow(WorkflowInstance workflow, CancellationToken cancellationToken = default)
    {
        await WorkflowInstances.InsertOneAsync(workflow, cancellationToken: cancellationToken);
        return workflow.Id;
    }

    public async Task PersistWorkflow(WorkflowInstance workflow, CancellationToken cancellationToken = default)
    {
        await WorkflowInstances.ReplaceOneAsync(x => x.Id == workflow.Id, workflow, cancellationToken: cancellationToken);
    }

    public async Task PersistWorkflow(WorkflowInstance workflow, List<EventSubscription> subscriptions, CancellationToken cancellationToken = default)
    {
        await PersistWorkflow(workflow, cancellationToken);

        foreach (var sub in subscriptions)
            await CreateEventSubscription(sub, cancellationToken);
    }

    public async Task<IEnumerable<string>> GetRunnableInstances(DateTime asAt, CancellationToken cancellationToken = default)
    {
        var now   = asAt.ToUniversalTime().Ticks;
        var query = WorkflowInstances
            .Find(x => x.NextExecution.HasValue && x.NextExecution <= now && x.Status == WorkflowStatus.Runnable)
            .Project(x => x.Id);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<WorkflowInstance> GetWorkflowInstance(string id, CancellationToken cancellationToken = default)
    {
        var cursor = await WorkflowInstances.FindAsync(x => x.Id == id, cancellationToken: cancellationToken);
        var result = await cursor.FirstOrDefaultAsync(cancellationToken);
        if (result == null)
            throw new NotFoundException();
        return result;
    }

    public async Task<IEnumerable<WorkflowInstance>> GetWorkflowInstances(IEnumerable<string> ids, CancellationToken cancellationToken = default)
    {
        if (ids == null) return [];

        var cursor = await WorkflowInstances.FindAsync(x => ids.Contains(x.Id), cancellationToken: cancellationToken);
        return await cursor.ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<WorkflowInstance>> GetWorkflowInstances(WorkflowStatus? status, string type,
        DateTime? createdFrom, DateTime? createdTo, int skip, int take)
    {
        var query = WorkflowInstances.AsQueryable();

        if (status.HasValue)      query = query.Where(x => x.Status == status.Value);
        if (!string.IsNullOrEmpty(type)) query = query.Where(x => x.WorkflowDefinitionId == type);
        if (createdFrom.HasValue) query = query.Where(x => x.CreateTime >= createdFrom.Value);
        if (createdTo.HasValue)   query = query.Where(x => x.CreateTime <= createdTo.Value);

        return query.Skip(skip).Take(take).ToList();
    }

    // ── ISubscriptionRepository ───────────────────────────────────────────
    public async Task<string> CreateEventSubscription(EventSubscription subscription, CancellationToken cancellationToken = default)
    {
        await EventSubscriptions.InsertOneAsync(subscription, cancellationToken: cancellationToken);
        return subscription.Id;
    }

    public async Task TerminateSubscription(string eventSubscriptionId, CancellationToken cancellationToken = default)
    {
        await EventSubscriptions.DeleteOneAsync(x => x.Id == eventSubscriptionId, cancellationToken);
    }

    public async Task<IEnumerable<EventSubscription>> GetSubscriptions(string eventName, string eventKey,
        DateTime asOf, CancellationToken cancellationToken = default)
    {
        var query = EventSubscriptions
            .Find(x => x.EventName == eventName && x.EventKey == eventKey && x.SubscribeAsOf <= asOf);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<EventSubscription> GetSubscription(string eventSubscriptionId, CancellationToken cancellationToken = default)
    {
        var cursor = await EventSubscriptions.FindAsync(x => x.Id == eventSubscriptionId, cancellationToken: cancellationToken);
        return await cursor.FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<EventSubscription> GetFirstOpenSubscription(string eventName, string eventKey,
        DateTime asOf, CancellationToken cancellationToken = default)
    {
        var query = EventSubscriptions
            .Find(x => x.EventName == eventName && x.EventKey == eventKey
                     && x.SubscribeAsOf <= asOf && x.ExternalToken == null);

        return await query.FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<bool> SetSubscriptionToken(string eventSubscriptionId, string token, string workerId,
        DateTime expiry, CancellationToken cancellationToken = default)
    {
        var update = Builders<EventSubscription>.Update
            .Set(x => x.ExternalToken,      token)
            .Set(x => x.ExternalTokenExpiry, expiry)
            .Set(x => x.ExternalWorkerId,    workerId);

        var result = await EventSubscriptions.UpdateOneAsync(
            x => x.Id == eventSubscriptionId && x.ExternalToken == null,
            update, cancellationToken: cancellationToken);

        return result.ModifiedCount > 0;
    }

    public async Task ClearSubscriptionToken(string eventSubscriptionId, string token, CancellationToken cancellationToken = default)
    {
        var update = Builders<EventSubscription>.Update
            .Set(x => x.ExternalToken,      (string?)null)
            .Set(x => x.ExternalTokenExpiry, (DateTime?)null)
            .Set(x => x.ExternalWorkerId,    (string?)null);

        await EventSubscriptions.UpdateOneAsync(
            x => x.Id == eventSubscriptionId && x.ExternalToken == token,
            update, cancellationToken: cancellationToken);
    }

    // ── IEventRepository ─────────────────────────────────────────────────
    public async Task<string> CreateEvent(Event newEvent, CancellationToken cancellationToken = default)
    {
        await Events.InsertOneAsync(newEvent, cancellationToken: cancellationToken);
        return newEvent.Id;
    }

    public async Task<Event> GetEvent(string id, CancellationToken cancellationToken = default)
    {
        var cursor = await Events.FindAsync(x => x.Id == id, cancellationToken: cancellationToken);
        return await cursor.FirstAsync(cancellationToken);
    }

    public async Task<IEnumerable<string>> GetRunnableEvents(DateTime asAt, CancellationToken cancellationToken = default)
    {
        var now   = asAt.ToUniversalTime();
        var query = Events
            .Find(x => !x.IsProcessed && x.EventTime <= now)
            .Project(x => x.Id);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<string>> GetEvents(string eventName, string eventKey,
        DateTime asOf, CancellationToken cancellationToken = default)
    {
        var query = Events
            .Find(x => x.EventName == eventName && x.EventKey == eventKey && x.EventTime >= asOf)
            .Project(x => x.Id);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task MarkEventProcessed(string id, CancellationToken cancellationToken = default)
    {
        var update = Builders<Event>.Update.Set(x => x.IsProcessed, true);
        await Events.UpdateOneAsync(x => x.Id == id, update, cancellationToken: cancellationToken);
    }

    public async Task MarkEventUnprocessed(string id, CancellationToken cancellationToken = default)
    {
        var update = Builders<Event>.Update.Set(x => x.IsProcessed, false);
        await Events.UpdateOneAsync(x => x.Id == id, update, cancellationToken: cancellationToken);
    }

    // ── IPersistenceProvider (misc) ───────────────────────────────────────
    public async Task PersistErrors(IEnumerable<ExecutionError> errors, CancellationToken cancellationToken = default)
    {
        var list = errors.ToList();
        if (list.Count > 0)
            await ExecutionErrors.InsertManyAsync(list, cancellationToken: cancellationToken);
    }

    public void EnsureStoreExists() { }

    // ── IScheduledCommandRepository ───────────────────────────────────────
    public bool SupportsScheduledCommands => true;

    public async Task ScheduleCommand(ScheduledCommand command)
    {
        await ScheduledCommands.InsertOneAsync(command);
    }

    public async Task ProcessCommands(DateTimeOffset asOf, Func<ScheduledCommand, Task> action,
        CancellationToken cancellationToken = default)
    {
        var cursor = await ScheduledCommands.FindAsync(
            x => x.ExecuteTime <= asOf.UtcTicks,
            cancellationToken: cancellationToken);

        await cursor.ForEachAsync(async cmd =>
        {
            await action(cmd);
            await ScheduledCommands.DeleteOneAsync(
                x => x.CommandName == cmd.CommandName && x.ExecuteTime == cmd.ExecuteTime,
                cancellationToken);
        }, cancellationToken);
    }

    // ── indexes ───────────────────────────────────────────────────────────
    private void EnsureIndexes()
    {
        if (_indexesCreated) return;

        // Drop legacy indexes that may exist from older versions with different names.
        // MongoDB rejects creating an index with a new name if the same key pattern already exists.
        DropIndexIfExists(Events,             "idx_namekey");
        DropIndexIfExists(Events,             "idx_processed");
        DropIndexIfExists(EventSubscriptions, "idx_namekey");

        WorkflowInstances.Indexes.CreateOne(new CreateIndexModel<WorkflowInstance>(
            Builders<WorkflowInstance>.IndexKeys.Ascending(x => x.NextExecution),
            new CreateIndexOptions { Background = true, Name = "idx_nextExec" }));

        Events.Indexes.CreateOne(new CreateIndexModel<Event>(
            Builders<Event>.IndexKeys
                .Ascending(x => x.EventName)
                .Ascending(x => x.EventKey)
                .Ascending(x => x.EventTime),
            new CreateIndexOptions { Background = true, Name = "idx_event_namekey" }));

        Events.Indexes.CreateOne(new CreateIndexModel<Event>(
            Builders<Event>.IndexKeys.Ascending(x => x.IsProcessed),
            new CreateIndexOptions { Background = true, Name = "idx_event_processed" }));

        EventSubscriptions.Indexes.CreateOne(new CreateIndexModel<EventSubscription>(
            Builders<EventSubscription>.IndexKeys
                .Ascending(x => x.EventName)
                .Ascending(x => x.EventKey),
            new CreateIndexOptions { Background = true, Name = "idx_sub_namekey" }));

        ScheduledCommands.Indexes.CreateOne(new CreateIndexModel<ScheduledCommand>(
            Builders<ScheduledCommand>.IndexKeys.Ascending(x => x.ExecuteTime),
            new CreateIndexOptions { Background = true, Name = "idx_cmd_exectime" }));

        _indexesCreated = true;
    }

    private static void DropIndexIfExists<T>(IMongoCollection<T> collection, string indexName)
    {
        try
        {
            collection.Indexes.DropOne(indexName);
        }
        catch (MongoCommandException)
        {
            // Index didn't exist — nothing to do.
        }
    }
}