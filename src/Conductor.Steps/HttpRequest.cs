using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace Conductor.Steps;

/// <summary>
/// Workflow step that executes an HTTP request using <see cref="IHttpClientFactory"/>.
/// Replaces the old RestSharp-based implementation.
/// </summary>
public class HttpRequest : StepBodyAsync
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<HttpRequest> _logger;

    public HttpRequest(IHttpClientFactory httpClientFactory, ILogger<HttpRequest> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger            = logger;
    }

    // ── inputs ────────────────────────────────────────────────────────────
    /// <summary>Base URL, e.g. https://api.example.com</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Path relative to <see cref="BaseUrl"/>, e.g. /users/42</summary>
    public string Resource { get; set; } = string.Empty;

    /// <summary>HTTP method: GET, POST, PUT, PATCH, DELETE (default: GET).</summary>
    public string Method { get; set; } = "GET";

    public IDictionary<string, object>? Headers    { get; set; }
    public IDictionary<string, object>? Parameters { get; set; }

    /// <summary>Request body — serialised to JSON when present.</summary>
    public ExpandoObject? Body { get; set; }

    // ── outputs ───────────────────────────────────────────────────────────
    public bool   IsSuccessful  { get; set; }
    public int    ResponseCode  { get; set; }
    public string ErrorMessage  { get; set; } = string.Empty;

    /// <summary>Parsed JSON response body as a dynamic object.</summary>
    public dynamic? ResponseBody { get; set; }

    // ── execution ─────────────────────────────────────────────────────────
    public override async Task<ExecutionResult> RunAsync(IStepExecutionContext context)
    {
        // Build URL with optional query-string parameters
        var url = BuildUrl();

        using var client  = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(ParseMethod(Method), url);

        // Headers
        if (Headers != null)
            foreach (var (key, value) in Headers)
                request.Headers.TryAddWithoutValidation(key, Convert.ToString(value));

        // Body
        if (Body != null)
            request.Content = new StringContent(
                JsonSerializer.Serialize(Body),
                Encoding.UTF8,
                "application/json");

        try
        {
            using var response = await client.SendAsync(request, context.CancellationToken);
            ResponseCode  = (int)response.StatusCode;
            IsSuccessful  = response.IsSuccessStatusCode;

            if (response.IsSuccessStatusCode)
            {
                // Deserialise to a dynamic ExpandoObject so workflow expressions can traverse the tree
                var json = await response.Content.ReadAsStringAsync(context.CancellationToken);
                if (!string.IsNullOrWhiteSpace(json))
                    ResponseBody = JsonSerializer.Deserialize<ExpandoObject>(json,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            else
            {
                ErrorMessage = await response.Content.ReadAsStringAsync(context.CancellationToken);
                _logger.LogWarning("HttpRequest step received {StatusCode} from {Url}: {Error}",
                    ResponseCode, url, ErrorMessage);
            }
        }
        catch (HttpRequestException ex)
        {
            IsSuccessful = false;
            ErrorMessage = ex.Message;
            _logger.LogError(ex, "HttpRequest step failed for {Url}", url);
        }

        return ExecutionResult.Next();
    }

    // ── helpers ───────────────────────────────────────────────────────────
    private string BuildUrl()
    {
        var baseUri = BaseUrl.TrimEnd('/');
        var path    = Resource.TrimStart('/');
        var url     = string.IsNullOrEmpty(path) ? baseUri : $"{baseUri}/{path}";

        if (Parameters == null || Parameters.Count == 0)
            return url;

        var qs = new StringBuilder("?");
        foreach (var (key, value) in Parameters)
        {
            qs.Append(Uri.EscapeDataString(key));
            qs.Append('=');
            qs.Append(Uri.EscapeDataString(Convert.ToString(value) ?? string.Empty));
            qs.Append('&');
        }
        return url + qs.ToString().TrimEnd('&');
    }

    private static HttpMethod ParseMethod(string method) =>
        method.ToUpperInvariant() switch
        {
            "GET"    => HttpMethod.Get,
            "POST"   => HttpMethod.Post,
            "PUT"    => HttpMethod.Put,
            "PATCH"  => HttpMethod.Patch,
            "DELETE" => HttpMethod.Delete,
            "HEAD"   => HttpMethod.Head,
            _        => throw new ArgumentException($"Unsupported HTTP method: {method}")
        };
}
