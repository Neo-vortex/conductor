using System;

namespace Conductor.Models
{
    public class DiagnosticInfo
    {
        public DateTime StartTime { get; set; }
        public string MachineName { get; set; }
        public string Version { get; set; }
        public string OSVersion { get; set; }
        public long WorkingSet { get; set; }
    }
}