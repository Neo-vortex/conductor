using AutoMapper;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace Conductor.Mappings
{
    public class APIProfile : Profile
    {
        public APIProfile()
        {
            CreateMap<WorkflowInstance, Models.WorkflowInstance>()
                .ForMember(dest => dest.DefinitionId, opt => opt.MapFrom(src => src.WorkflowDefinitionId))
                .ForMember(dest => dest.EndTime, opt => opt.MapFrom(src => src.CompleteTime))
                .ForMember(dest => dest.Reference, opt => opt.MapFrom(src => src.Reference))
                .ForMember(dest => dest.StartTime, opt => opt.MapFrom(src => src.CreateTime))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status))
                .ForMember(dest => dest.Version, opt => opt.MapFrom(src => src.Version))
                .ForMember(dest => dest.Data, opt => opt.MapFrom(src => src.Data))
                .ForMember(dest => dest.WorkflowId, opt => opt.MapFrom(src => src.Id));

            CreateMap<PendingActivity, Models.PendingActivity>()
                .ForMember(dest => dest.Token, opt => opt.MapFrom(src => src.Token))
                .ForMember(dest => dest.TokenExpiry, opt => opt.MapFrom(src => src.TokenExpiry))
                .ForMember(dest => dest.Parameters, opt => opt.MapFrom(src => src.Parameters))
                .ForMember(dest => dest.ActivityName, opt => opt.MapFrom(src => src.ActivityName));
        }
    }
}