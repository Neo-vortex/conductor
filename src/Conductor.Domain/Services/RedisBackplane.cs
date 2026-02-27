using System;
using System.Threading.Tasks;
using Conductor.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Conductor.Domain.Services
{
    public class RedisBackplane : IClusterBackplane
    {
        private readonly string _channel;
        private readonly string _connectionString;
        private readonly IWorkflowLoader _loader;
        private readonly ILogger _logger;
        private readonly Guid _nodeId = Guid.NewGuid();
        private readonly IDefinitionRepository _repository;

        private readonly JsonSerializerSettings _serializerSettings = new JsonSerializerSettings
            { TypeNameHandling = TypeNameHandling.All };

        private IConnectionMultiplexer _multiplexer;
        private ISubscriber _subscriber;

        public RedisBackplane(string connectionString, string channel, IDefinitionRepository repository,
            IWorkflowLoader loader, ILoggerFactory logFactory)
        {
            _connectionString = connectionString;
            _channel = channel;
            _repository = repository;
            _loader = loader;
            _logger = logFactory.CreateLogger(GetType());
        }

        public async Task Start()
        {
            _multiplexer = await ConnectionMultiplexer.ConnectAsync(_connectionString);
            _subscriber = _multiplexer.GetSubscriber();
            _subscriber.Subscribe(_channel, (channel, message) =>
            {
                var evt = JsonConvert.DeserializeObject(message, _serializerSettings);
                //TODO: split out future commands
                if (evt is NewDefinitionCommand)
                    try
                    {
                        if ((evt as NewDefinitionCommand).Originator == _nodeId)
                            return;
                        var def = _repository.Find((evt as NewDefinitionCommand).DefinitionId,
                            (evt as NewDefinitionCommand).Version);
                        _loader.LoadDefinition(def);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(default, ex, ex.Message);
                    }
            });
        }

        public async Task Stop()
        {
            await _subscriber.UnsubscribeAllAsync();
            await _multiplexer.CloseAsync();
            _subscriber = null;
            _multiplexer = null;
        }

        public void LoadNewDefinition(string id, int version)
        {
            // Fire-and-forget publish; errors are logged but not propagated to the caller
            // because IClusterBackplane.LoadNewDefinition is a synchronous interface method.
            _ = PublishAsync(id, version);
        }

        private async Task PublishAsync(string id, int version)
        {
            try
            {
                var data = JsonConvert.SerializeObject(new NewDefinitionCommand
                {
                    Originator   = _nodeId,
                    DefinitionId = id,
                    Version      = version
                }, _serializerSettings);

                await _subscriber.PublishAsync(_channel, data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish new definition command for {DefinitionId} v{Version}", id, version);
            }
        }
    }

    public class NewDefinitionCommand
    {
        public Guid Originator { get; set; }
        public string DefinitionId { get; set; }
        public int Version { get; set; }
    }
}