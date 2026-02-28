using Conductor.Domain.Models;

namespace Conductor.Domain.Interfaces;

public interface IWorkflowLoader
{
    void LoadDefinition(Definition source);
}