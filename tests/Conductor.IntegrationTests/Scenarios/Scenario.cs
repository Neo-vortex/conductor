using System.Text;
using Conductor.Models;
using Newtonsoft.Json;

namespace Conductor.IntegrationTests.Scenarios;

public abstract class Scenario
{
    protected readonly HttpClient _client;

    protected Scenario(Setup setup)
    {
        _client = new HttpClient { BaseAddress = new Uri(setup.Server1) };
    }

    protected async Task<T?> GetAsync<T>(string path)
    {
        var response = await _client.GetAsync(path);
        var json = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<T>(json);
    }

    protected async Task<HttpResponseMessage> PostJsonAsync(string path, object body)
    {
        var json = JsonConvert.SerializeObject(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        return await _client.PostAsync(path, content);
    }

    protected async Task<(HttpResponseMessage Response, T? Data)> PostJsonAsync<T>(string path, object body)
    {
        var response = await PostJsonAsync(path, body);
        var json = await response.Content.ReadAsStringAsync();
        var data = JsonConvert.DeserializeObject<T>(json);
        return (response, data);
    }

    protected async Task<WorkflowInstance?> WaitForComplete(string workflowId)
    {
        WorkflowInstance? instance = null;
        var count = 0;

        while (count < 60)
        {
            instance = await GetAsync<WorkflowInstance>($"/workflow/{workflowId}");
            if (instance?.Status == "Complete") break;
            await Task.Delay(500);
            count++;
        }

        return instance;
    }
}