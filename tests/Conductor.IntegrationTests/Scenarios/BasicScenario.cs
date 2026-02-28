using System.Dynamic;
using System.Net;
using Conductor.Domain.Models;
using Conductor.Models;
using FluentAssertions;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Conductor.IntegrationTests.Scenarios;

[Collection("Conductor")]
public class BasicScenario : Scenario
{
    public BasicScenario(Setup setup) : base(setup)
    {
    }

    [Fact]
    public async Task Scenario()
    {
        dynamic inputs = new ExpandoObject();
        inputs.Value1 = "data.Value1";
        inputs.Value2 = "data.Value2";

        var definition = new Definition
        {
            Id = Guid.NewGuid().ToString(),
            Steps = new List<Step>
            {
                new()
                {
                    Id = "step1",
                    StepType = "AddTest",
                    Inputs = inputs,
                    Outputs = new Dictionary<string, string> { ["Result"] = "step.Result" }
                }
            }
        };

        var registerResponse = await PostJsonAsync("/definition", definition);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await Task.Delay(1000);

        var (startResponse, startData) =
            await PostJsonAsync<WorkflowInstance>($"/workflow/{definition.Id}", new { Value1 = 2, Value2 = 3 });
        startResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var instance = await WaitForComplete(startData!.WorkflowId);
        instance!.Status.Should().Be("Complete");
        JObject.FromObject(instance.Data!)["Result"]!.Value<int>().Should().Be(5);
    }
}