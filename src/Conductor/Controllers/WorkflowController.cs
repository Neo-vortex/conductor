using System.Dynamic;
using Conductor.Auth;
using Conductor.Mappings;
using Conductor.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Interface;

namespace Conductor.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class WorkflowController : ControllerBase
{
    private readonly IMapper _mapper;
    private readonly IPersistenceProvider _persistenceProvider;
    private readonly IWorkflowController _workflowController;

    public WorkflowController(IWorkflowController workflowController, IPersistenceProvider persistenceProvider,
        IMapper mapper)
    {
        _workflowController = workflowController;
        _persistenceProvider = persistenceProvider;
        _mapper = mapper;
    }

    [HttpGet("{id}")]
    [Authorize(Policy = Policies.Viewer)]
    public async Task<ActionResult<WorkflowInstance>> Get(string id)
    {
        var result = await _persistenceProvider.GetWorkflowInstance(id);
        if (result == null)
            return NotFound();

        return Ok(_mapper.Map(result));
    }

    [HttpPost("{id}")]
    [Authorize(Policy = Policies.Controller)]
    public async Task<ActionResult<WorkflowInstance>> Post(string id, [FromBody] ExpandoObject data)
    {
        var instanceId = await _workflowController.StartWorkflow(id, data);
        var result = await _persistenceProvider.GetWorkflowInstance(instanceId);

        return Created(instanceId, _mapper.Map(result));
    }

    [HttpPut("{id}/suspend")]
    [Authorize(Policy = Policies.Controller)]
    public async Task<IActionResult> Suspend(string id)
    {
        var result = await _workflowController.SuspendWorkflow(id);
        return result ? Ok() : BadRequest();
    }

    [HttpPut("{id}/resume")]
    [Authorize(Policy = Policies.Controller)]
    public async Task<IActionResult> Resume(string id)
    {
        var result = await _workflowController.ResumeWorkflow(id);
        return result ? Ok() : BadRequest();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.Controller)]
    public async Task<IActionResult> Terminate(string id)
    {
        var result = await _workflowController.TerminateWorkflow(id);
        return result ? Ok() : BadRequest();
    }
}