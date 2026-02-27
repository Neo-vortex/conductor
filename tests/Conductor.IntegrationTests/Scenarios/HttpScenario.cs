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
public class HttpScenario : Scenario
{
    public HttpScenario(Setup setup) : base(setup) { }

    [Fact]
    public async Task should_get()
    {
        dynamic inputs = new ExpandoObject();
        inputs.BaseUrl  = @"""http://demo7149346.mockable.io/""";
        inputs.Resource = @"""ping""";

        var definition = new Definition
        {
            Id = Guid.NewGuid().ToString(),
            Steps = new List<Step>
            {
                new()
                {
                    Id       = "step1",
                    StepType = "HttpRequest",
                    Inputs   = inputs,
                    Outputs  = new Dictionary<string, string>
                    {
                        ["ResponseCode"] = "step.ResponseCode",
                        ["ResponseBody"] = "step.ResponseBody"
                    }
                }
            }
        };

        var registerResponse = await PostJsonAsync("/definition", definition);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await Task.Delay(1000);

        var (startResponse, startData) = await PostJsonAsync<WorkflowInstance>($"/workflow/{definition.Id}", new { });
        startResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var instance = await WaitForComplete(startData!.WorkflowId);
        instance!.Status.Should().Be("Complete");
        JObject.FromObject(instance.Data!)["ResponseCode"]!.Value<int>().Should().Be(200);
    }
}