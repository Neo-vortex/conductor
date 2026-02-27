using System.Dynamic;
using System.Net;
using Conductor.Domain.Models;
using Conductor.Models;
using FluentAssertions;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Conductor.IntegrationTests.Scenarios;

[Collection("Conductor")]
public class DecisionScenario : Scenario
{
    public DecisionScenario(Setup setup) : base(setup)
    {
    }

    [Fact]
    public async Task Scenario()
    {
        dynamic add1inputs = new ExpandoObject();
        add1inputs.Value1 = "data.Value1";
        add1inputs.Value2 = "data.Value2";

        dynamic add2inputs = new ExpandoObject();
        add2inputs.Value1 = "data.Value1";
        add2inputs.Value2 = "data.Value3";

        var definition = new Definition
        {
            Id = Guid.NewGuid().ToString(),
            Steps = new List<Step>
            {
                new()
                {
                    Id = "Decide",
                    StepType = "Decide",
                    SelectNextStep = new Dictionary<string, string>
                    {
                        ["A"] = "data.Flag == 1",
                        ["B"] = "data.Flag == 0"
                    }
                },
                new()
                {
                    Id = "A",
                    StepType = "AddTest",
                    Inputs = add1inputs,
                    Outputs = new Dictionary<string, string> { ["Result"] = "step.Result" }
                },
                new()
                {
                    Id = "B",
                    StepType = "AddTest",
                    Inputs = add2inputs,
                    Outputs = new Dictionary<string, string> { ["Result"] = "step.Result" }
                }
            }
        };

        var registerResponse = await PostJsonAsync("/definition", definition);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await Task.Delay(1000);

        var (startResponse1, startData1) = await PostJsonAsync<WorkflowInstance>($"/workflow/{definition.Id}",
            new { Value1 = 2, Value2 = 3, Value3 = 4, Flag = 1 });
        startResponse1.StatusCode.Should().Be(HttpStatusCode.Created);

        var (startResponse2, startData2) = await PostJsonAsync<WorkflowInstance>($"/workflow/{definition.Id}",
            new { Value1 = 2, Value2 = 3, Value3 = 4, Flag = 0 });
        startResponse2.StatusCode.Should().Be(HttpStatusCode.Created);

        var instance1 = await WaitForComplete(startData1!.WorkflowId);
        instance1!.Status.Should().Be("Complete");
        JObject.FromObject(instance1.Data!)["Result"]!.Value<int>().Should().Be(5);

        var instance2 = await WaitForComplete(startData2!.WorkflowId);
        instance2!.Status.Should().Be("Complete");
        JObject.FromObject(instance2.Data!)["Result"]!.Value<int>().Should().Be(6);
    }
}