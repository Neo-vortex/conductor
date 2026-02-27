using Conductor.Models;
using WorkflowCore.Interface;
using WorkflowCore.Models;
using PendingActivity = WorkflowCore.Interface.PendingActivity;
using WorkflowInstance = WorkflowCore.Models.WorkflowInstance;

namespace Conductor.Mappings;

/// <summary>
/// Lightweight manual mapper — replaces AutoMapper.
/// </summary>
public static class APIProfile
{
    public static IMapper CreateMapper() => new ManualMapper();

    private sealed class ManualMapper : IMapper
    {
        public Models.WorkflowInstance Map(WorkflowInstance src) => new()
        {
            WorkflowId   = src.Id,
            DefinitionId = src.WorkflowDefinitionId,
            Version      = src.Version,
            Status       = src.Status.ToString(),
            Reference    = src.Reference,
            Data         = src.Data,
            StartTime    = src.CreateTime,
            EndTime      = src.CompleteTime
        };

        public Models.PendingActivity Map(PendingActivity src) => new()
        {
            Token        = src.Token,
            TokenExpiry  = src.TokenExpiry,
            Parameters   = src.Parameters,
            ActivityName = src.ActivityName
        };
    }
}

/// <summary>Thin interface so the mapper can be injected without AutoMapper.</summary>
public interface IMapper
{
    Models.WorkflowInstance Map(WorkflowInstance src);
    Models.PendingActivity  Map(PendingActivity src);
}
