using Microsoft.Extensions.DependencyInjection;

namespace Conductor.Steps;

public static class ServiceCollectionExtensions
{
    public static void AddSteps(this IServiceCollection services)
    {
        // HttpRequest uses IHttpClientFactory — ensure AddHttpClient() has been called by the host.
        services.AddTransient<HttpRequest>();
        services.AddTransient<EmitLog>();
    }
}
