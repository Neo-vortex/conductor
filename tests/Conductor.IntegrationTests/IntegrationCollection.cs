using Xunit;

namespace Conductor.IntegrationTests
{
    [CollectionDefinition("Conductor")]
    public class IntegrationCollection : ICollectionFixture<Setup>
    {
    }
}