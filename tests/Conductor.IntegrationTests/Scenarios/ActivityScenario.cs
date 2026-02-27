using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Net;
using System.Threading.Tasks;
using Conductor.Domain.Models;
using Conductor.Models;
using FluentAssertions;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Conductor.IntegrationTests.Scenarios;

[Collection("Conductor")]
public class ActivityScenario : Scenario
{
    public ActivityScenario(Setup setup) : base(setup) { }

    [Fact]
    public async Task Scenario()
    {
        dynamic inputs = new ExpandoObject();
        inputs.ActivityName = "'act1'";
        inputs.Parameters   = "data";

        var definition = new Definition
        {
            Id = Guid.NewGuid().ToString(),
            Steps = new List<Step>
            {
                new()
                {
                    Id       = "step1",
                    StepType = "Activity",
                    Inputs   = inputs,
                    Outputs  = new Dictionary<string, string> { ["Result"] = "step.Result" }
                }
            }
        };

        var registerResponse = await PostJsonAsync("/definition", definition);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await Task.Delay(1000);

        var (startResponse, startData) = await PostJsonAsync<WorkflowInstance>($"/workflow/{definition.Id}", new { Value1 = 2, Value2 = 3 });
        startResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var activity = await GetAsync<PendingActivity>("/activity/act1?timeout=10");
        activity.Should().NotBeNull();

        var activityInput = JObject.FromObject(activity!.Parameters!);
        // Box to object so the JSON serialiser treats it as a value, not a generic type param
        object actResult = activityInput["Value1"]!.Value<int>() + activityInput["Value2"]!.Value<int>();

        var successResponse = await PostJsonAsync($"/activity/success/{activity.Token}", actResult);
        successResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var instance = await WaitForComplete(startData!.WorkflowId);
        instance!.Status.Should().Be("Complete");
        JObject.FromObject(instance.Data!)["Result"]!.Value<int>().Should().Be(5);
    }
}