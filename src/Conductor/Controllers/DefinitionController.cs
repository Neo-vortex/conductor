using System.Collections.Generic;
using Conductor.Auth;
using Conductor.Domain.Interfaces;
using Conductor.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conductor.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DefinitionController : ControllerBase
{
    private readonly IDefinitionService _service;

    public DefinitionController(IDefinitionService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Policy = Policies.Author)]
    public ActionResult<IEnumerable<Definition>> Get()
    {
        // GetDefinition only fetches by id — expose the full known IDs via the registry
        // For now return a list by scanning the repository through the service
        // (extend IDefinitionService with GetAll() if you need pagination later)
        return Ok(_service.GetAllDefinitions());
    }

    [HttpGet("{id}")]
    [Authorize(Policy = Policies.Author)]
    public ActionResult<Definition> Get(string id)
    {
        var result = _service.GetDefinition(id);
        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = Policies.Author)]
    public IActionResult Post([FromBody] Definition value)
    {
        _service.RegisterNewDefinition(value);
        return NoContent();
    }

    [HttpPut]
    [Authorize(Policy = Policies.Author)]
    public IActionResult Put([FromBody] Definition value)
    {
        var existing = _service.GetDefinition(value.Id);
        if (existing == null)
            return NotFound();

        value.Version = existing.Version;
        _service.ReplaceVersion(value);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.Author)]
    public IActionResult Delete(string id)
    {
        var existing = _service.GetDefinition(id);
        if (existing == null)
            return NotFound();

        _service.DeleteDefinition(id);
        return NoContent();
    }
}