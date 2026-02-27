using System.Net;
using System.Text;
using Conductor.Domain.Models;
using FluentAssertions;
using Newtonsoft.Json;
using Xunit;

namespace Conductor.IntegrationTests.Cluster;

[Collection("Conductor")]
public class BackplaneTests
{
    private readonly HttpClient _client1;
    private readonly HttpClient _client2;

    public BackplaneTests(Setup setup)
    {
        _client1 = new HttpClient { BaseAddress = new Uri(setup.Server1) };
        _client2 = new HttpClient { BaseAddress = new Uri(setup.Server2) };
    }

    [Fact]
    public async Task should_notify_peers_of_new_definitions()
    {
        var definition = new Definition
        {
            Id = Guid.NewGuid().ToString(),
            Steps = new List<Step>
            {
                new() { Id = "step1", StepType = "EmitLog" }
            }
        };

        var json = JsonConvert.SerializeObject(definition);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var registerResponse = await _client1.PostAsync("/definition", content);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await Task.Delay(1000);

        var startContent = new StringContent("{}", Encoding.UTF8, "application/json");
        var startResponse = await _client2.PostAsync($"/workflow/{definition.Id}", startContent);
        startResponse.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}