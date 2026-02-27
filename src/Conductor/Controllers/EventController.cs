using Conductor.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Interface;

namespace Conductor.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EventController : ControllerBase
{
    private readonly IWorkflowController _workflowController;

    public EventController(IWorkflowController workflowController)
    {
        _workflowController = workflowController;
    }

    [Authorize(Policy = Policies.Controller)]
    [HttpPost("{name}/{key}")]
    public async Task Post(string name, string key, [FromBody] object data)
    {
        await _workflowController.PublishEvent(name, key, data);
        Response.StatusCode = 204;
    }
}