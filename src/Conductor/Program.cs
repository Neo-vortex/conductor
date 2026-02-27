using Conductor;
using Conductor.Auth;
using Conductor.Domain;
using Conductor.Domain.Interfaces;
using Conductor.Domain.Scripting;
using Conductor.Domain.Services;
using Conductor.Formatters;
using Conductor.Mappings;
using Conductor.Middleware;
using Conductor.Steps;
using Conductor.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi;
using WorkflowCore.Interface;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ── connection strings ────────────────────────────────────────────────────
var dbConnectionStr = EnvironmentVariables.DbHost
                      ?? config.GetValue<string>("DbConnectionString")
                      ?? throw new InvalidOperationException(
                          "No DB connection string configured (env: dbhost / DbConnectionString).");

var redisConnectionStr = EnvironmentVariables.Redis
                         ?? config.GetValue<string>("RedisConnectionString");

var authEnabledRaw = EnvironmentVariables.Auth;
var authEnabled = string.IsNullOrEmpty(authEnabledRaw)
    ? config.GetSection("Auth").GetValue<bool>("Enabled")
    : Convert.ToBoolean(authEnabledRaw);

// ── MVC ───────────────────────────────────────────────────────────────────
builder.Services.AddControllers(options =>
    {
        options.InputFormatters.Add(new YamlRequestBodyInputFormatter());
        options.OutputFormatters.Add(new YamlRequestBodyOutputFormatter());
        options.Filters.Add<RequestObjectFilter>();
        options.Filters.Add<ExceptionCodeFilter>();
    })
    .AddNewtonsoftJson();

// ── Swagger ───────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new OpenApiInfo { Version = "v1", Title = "Conductor API" }));

// ── auth ──────────────────────────────────────────────────────────────────
var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
});

if (authEnabled)
    authBuilder.AddJwtAuth(config);
else
    authBuilder.AddBypassAuth();

builder.Services.AddPolicies();

// ── workflow core ─────────────────────────────────────────────────────────
builder.Services.AddWorkflow(cfg =>
{
    cfg.UseMongoDB(dbConnectionStr, config.GetValue<string>("DbName") ?? "conductor");
    if (!string.IsNullOrEmpty(redisConnectionStr))
    {
        cfg.UseRedisLocking(redisConnectionStr);
        cfg.UseRedisQueues(redisConnectionStr, "conductor");
    }
});

// ── domain / storage / steps ──────────────────────────────────────────────
builder.Services.ConfigureDomainServices();
builder.Services.ConfigureScripting();
builder.Services.AddSteps();
builder.Services.UseMongoDB(dbConnectionStr, config.GetValue<string>("DbName") ?? "conductor");

// ── cluster backplane ─────────────────────────────────────────────────────
if (string.IsNullOrEmpty(redisConnectionStr))
    builder.Services.AddSingleton<IClusterBackplane, LocalBackplane>();
else
    builder.Services.AddSingleton<IClusterBackplane>(sp => new RedisBackplane(
        redisConnectionStr,
        "conductor",
        sp.GetRequiredService<IDefinitionRepository>(),
        sp.GetRequiredService<IWorkflowLoader>(),
        sp.GetRequiredService<ILoggerFactory>()));

// ── mappings ──────────────────────────────────────────────────────────────
builder.Services.AddSingleton(APIProfile.CreateMapper());

// ── CORS ──────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        else
            policy.WithOrigins(
                    config.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
                .AllowAnyMethod()
                .AllowAnyHeader();
    }));

// ── HttpClient (used by HttpRequest step) ─────────────────────────────────
builder.Services.AddHttpClient();

// ── build ─────────────────────────────────────────────────────────────────
var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "API V1"));

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── start workflow engine ─────────────────────────────────────────────────
var host = app.Services.GetRequiredService<IWorkflowHost>();
var defService = app.Services.GetRequiredService<IDefinitionService>();
var backplane = app.Services.GetRequiredService<IClusterBackplane>();

defService.LoadDefinitionsFromStorage();
await backplane.Start();
host.Start();

app.Lifetime.ApplicationStopped.Register(() =>
{
    host.Stop();
    // Fire-and-forget stop is acceptable here; the process is already exiting.
    backplane.Stop().GetAwaiter().GetResult();
});

await app.RunAsync();