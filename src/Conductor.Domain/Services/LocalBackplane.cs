using System.Threading.Tasks;
using Conductor.Domain.Interfaces;

namespace Conductor.Domain.Services
{
    public class LocalBackplane : IClusterBackplane
    {
        public Task Start()
        {
            return Task.CompletedTask;
        }

        public Task Stop()
        {
            return Task.CompletedTask;
        }

        public void LoadNewDefinition(string id, int version)
        {
        }
    }
}