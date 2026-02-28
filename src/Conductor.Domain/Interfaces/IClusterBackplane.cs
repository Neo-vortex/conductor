namespace Conductor.Domain.Interfaces;

public interface IClusterBackplane
{
    Task Start();
    Task Stop();
    void LoadNewDefinition(string id, int version);
}