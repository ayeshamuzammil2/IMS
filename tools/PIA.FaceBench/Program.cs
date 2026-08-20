using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PIA.Application.Options;
using PIA.Domain.Services;
using PIA.Infrastructure.Services.Attendance;

var modelsPath = GetArg(args, "--models") ?? Path.Combine(AppContext.BaseDirectory, "Assets", "Models");
var genuineDir = GetArg(args, "--genuine");
var attacksDir = GetArg(args, "--attacks");

var options = Options.Create(new FaceOptions { ModelsPath = modelsPath });
var provider = new OnnxFaceVerificationProvider(options, NullLogger<OnnxFaceVerificationProvider>.Instance);

Console.WriteLine("PIA.FaceBench - face verification calibration harness");
Console.WriteLine($"Models path: {modelsPath}");

if (!provider.IsConfigured)
{
    Console.WriteLine();
    Console.WriteLine("Face verification is NOT configured - no arcface_r100.onnx / minifasnet.onnx found at the models path.");
    Console.WriteLine("See backend/src/PIA.Infrastructure/Assets/Models/README.md for sourcing guidance before running a real benchmark.");
    return 1;
}

if (genuineDir is null && attacksDir is null)
{
    PrintUsage();
    return 0;
}

if (genuineDir is not null)
{
    await RunMatchBenchmarkAsync(provider, genuineDir);
}

if (attacksDir is not null)
{
    await RunPadBenchmarkAsync(provider, attacksDir);
}

return 0;

static string? GetArg(string[] args, string name)
{
    var idx = Array.IndexOf(args, name);
    return idx >= 0 && idx + 1 < args.Length ? args[idx + 1] : null;
}

static void PrintUsage()
{
    Console.WriteLine();
    Console.WriteLine("Usage:");
    Console.WriteLine("  dotnet run --project tools/PIA.FaceBench -- --genuine <folder> --attacks <folder> [--models <path>]");
    Console.WriteLine();
    Console.WriteLine("  --genuine <folder>  One subfolder per identity, each containing 2+ face-crop JPEGs of that person.");
    Console.WriteLine("                      Reports the genuine (same-identity) vs impostor (cross-identity) similarity");
    Console.WriteLine("                      distributions and suggests a match threshold via the FAR/FRR crossover.");
    Console.WriteLine("  --attacks <folder>  JPEGs named live_*.jpg / print_*.jpg / replay_*.jpg.");
    Console.WriteLine("                      Reports MiniFASNet live-probability by class and the resulting APCER/BPCER");
    Console.WriteLine("                      at the configured PadLiveThreshold.");
}

static async Task RunMatchBenchmarkAsync(OnnxFaceVerificationProvider provider, string genuineDir)
{
    var identityFolders = Directory.GetDirectories(genuineDir);
    if (identityFolders.Length == 0)
    {
        Console.WriteLine($"No identity subfolders found under {genuineDir}.");
        return;
    }

    var embeddingsByIdentity = new Dictionary<string, List<float[]>>();
    foreach (var folder in identityFolders)
    {
        var identity = Path.GetFileName(folder);
        var embeddings = new List<float[]>();
        foreach (var file in Directory.GetFiles(folder, "*.jpg").Concat(Directory.GetFiles(folder, "*.jpeg")))
        {
            var bytes = await File.ReadAllBytesAsync(file);
            var result = await provider.ExtractEmbeddingAsync(bytes, CancellationToken.None);
            if (result is not null) embeddings.Add(result.Embedding);
        }
        if (embeddings.Count > 0) embeddingsByIdentity[identity] = embeddings;
    }

    var genuineScores = new List<double>();
    var impostorScores = new List<double>();
    var identities = embeddingsByIdentity.Keys.ToList();

    for (var i = 0; i < identities.Count; i++)
    {
        var embeddingsA = embeddingsByIdentity[identities[i]];
        for (var a = 0; a < embeddingsA.Count; a++)
        {
            for (var b = a + 1; b < embeddingsA.Count; b++)
            {
                genuineScores.Add(FaceMath.CosineSimilarity(embeddingsA[a], embeddingsA[b]));
            }
        }

        for (var j = i + 1; j < identities.Count; j++)
        {
            var embeddingsB = embeddingsByIdentity[identities[j]];
            foreach (var e1 in embeddingsA)
            {
                foreach (var e2 in embeddingsB)
                {
                    impostorScores.Add(FaceMath.CosineSimilarity(e1, e2));
                }
            }
        }
    }

    Console.WriteLine();
    Console.WriteLine($"=== Face match benchmark ({identities.Count} identities) ===");
    PrintStats("Genuine (same identity)", genuineScores);
    PrintStats("Impostor (different identity)", impostorScores);

    var suggested = SuggestThreshold(genuineScores, impostorScores);
    Console.WriteLine($"Suggested match threshold (FAR/FRR crossover): {suggested:F3}");
}

static async Task RunPadBenchmarkAsync(OnnxFaceVerificationProvider provider, string attacksDir)
{
    var groups = new Dictionary<string, List<double>> { ["live"] = [], ["print"] = [], ["replay"] = [] };

    foreach (var file in Directory.GetFiles(attacksDir))
    {
        var name = Path.GetFileNameWithoutExtension(file).ToLowerInvariant();
        var label = name.StartsWith("live") ? "live" : name.StartsWith("print") ? "print" : name.StartsWith("replay") ? "replay" : null;
        if (label is null) continue;

        var bytes = await File.ReadAllBytesAsync(file);
        var pad = await provider.EvaluateLivenessAsync(bytes, CancellationToken.None);
        if (pad is not null) groups[label].Add(pad.LiveProbability);
    }

    Console.WriteLine();
    Console.WriteLine("=== PAD (liveness) benchmark ===");
    foreach (var (label, scores) in groups)
    {
        if (scores.Count == 0) continue;
        Console.WriteLine($"{label,-8} n={scores.Count,-4} mean live-prob={scores.Average():F3} min={scores.Min():F3} max={scores.Max():F3}");
    }

    const double padThreshold = 0.85; // FaceOptions.PadLiveThreshold default - override here if calibrating a different value.
    if (groups["live"].Count > 0)
    {
        var bpcer = groups["live"].Count(s => s < padThreshold) / (double)groups["live"].Count;
        var attackScores = groups["print"].Concat(groups["replay"]).ToList();
        var apcer = attackScores.Count > 0 ? attackScores.Count(s => s >= padThreshold) / (double)attackScores.Count : (double?)null;

        Console.WriteLine();
        Console.WriteLine($"At live-threshold {padThreshold:F2}: BPCER (bona fide rejected) = {bpcer:P1}" +
            (apcer is not null ? $", APCER (attack accepted) = {apcer:P1}" : string.Empty));
    }
}

static void PrintStats(string label, List<double> scores)
{
    if (scores.Count == 0)
    {
        Console.WriteLine($"{label}: no samples.");
        return;
    }
    scores.Sort();
    Console.WriteLine($"{label}: n={scores.Count} mean={scores.Average():F3} min={scores.Min():F3} max={scores.Max():F3} median={scores[scores.Count / 2]:F3}");
}

static double SuggestThreshold(List<double> genuine, List<double> impostor)
{
    const double defaultThreshold = 0.62; // FaceOptions.MatchThreshold default
    if (genuine.Count == 0 || impostor.Count == 0) return defaultThreshold;

    var best = defaultThreshold;
    var bestGap = double.MaxValue;
    for (var t = 0.30; t <= 0.90; t += 0.01)
    {
        var far = impostor.Count(s => s >= t) / (double)impostor.Count;
        var frr = genuine.Count(s => s < t) / (double)genuine.Count;
        var gap = Math.Abs(far - frr);
        if (gap < bestGap)
        {
            bestGap = gap;
            best = t;
        }
    }
    return best;
}
