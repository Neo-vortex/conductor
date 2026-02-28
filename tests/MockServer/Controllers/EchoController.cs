using Microsoft.AspNetCore.Mvc;

namespace MockServer.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EchoController : ControllerBase
{
    [HttpPost("{code}")]
    public void Post(int code, [FromBody] object value)
    {
        Response.StatusCode = code;
    }
}