using System;
using System.Threading.Tasks;
using Conductor.Auth;
using Conductor.Mappings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Interface;
using PendingActivity = Conductor.Models.PendingActivity;

namespace Conductor.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ActivityController : ControllerBase
{
    private readonly IActivityController _activityService;
    private readonly IMapper _mapper;

    public ActivityController(IActivityController activityService, IMapper mapper)
    {
        _activityService = activityService;
        _mapper          = mapper;
    }

    [Authorize(Policy = Policies.Worker)]
    [HttpPost("success/{token}")]
    public async Task<IActionResult> Success(string token, [FromBody] object data)
    {
        await _activityService.SubmitActivitySuccess(token, data);
        return Accepted();
    }

    [Authorize(Policy = Policies.Worker)]
    [HttpPost("fail/{token}")]
    public async Task<IActionResult> Fail(string token, [FromBody] object data)
    {
        await _activityService.SubmitActivityFailure(token, data);
        return Accepted();
    }

    [HttpGet("{name}")]
    [Authorize(Policy = Policies.Worker)]
    public async Task<IActionResult> Get(string name, string workerId, int timeout)
    {
        var result = await _activityService.GetPendingActivity(name, workerId, TimeSpan.FromSeconds(timeout));

        if (result == null)
            return NotFound();

        return Ok(_mapper.Map(result));
    }

    [Authorize(Policy = Policies.Worker)]
    [HttpDelete("{token}")]
    public async Task<IActionResult> Delete(string token)
    {
        await _activityService.ReleaseActivityToken(token);
        return Accepted();
    }
}
