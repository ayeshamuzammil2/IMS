namespace PIA.Infrastructure.Services.Attendance.VideoReplay;

/// <summary>Exact 4-point planar homography via direct linear solve (no SVD needed - 4 non-degenerate
/// correspondences fully determine an 8-parameter homography, so this is a plain 8x8 linear system
/// rather than the least-squares DLT used when more points are available).</summary>
public static class Homography
{
    /// <summary>Solves for H mapping src[i] -> dst[i] for i in 0..3. Returns null if the points are
    /// degenerate (near-collinear or duplicated) and no stable solution exists.</summary>
    public static double[,]? Fit4Point(IReadOnlyList<(double X, double Y)> src, IReadOnlyList<(double X, double Y)> dst)
    {
        if (src.Count != 4 || dst.Count != 4) return null;

        var a = new double[8, 8];
        var b = new double[8];

        for (var i = 0; i < 4; i++)
        {
            var (x, y) = src[i];
            var (xp, yp) = dst[i];

            var row1 = i * 2;
            a[row1, 0] = x; a[row1, 1] = y; a[row1, 2] = 1;
            a[row1, 3] = 0; a[row1, 4] = 0; a[row1, 5] = 0;
            a[row1, 6] = -x * xp; a[row1, 7] = -y * xp;
            b[row1] = xp;

            var row2 = i * 2 + 1;
            a[row2, 0] = 0; a[row2, 1] = 0; a[row2, 2] = 0;
            a[row2, 3] = x; a[row2, 4] = y; a[row2, 5] = 1;
            a[row2, 6] = -x * yp; a[row2, 7] = -y * yp;
            b[row2] = yp;
        }

        var h = SolveLinearSystem(a, b);
        if (h is null) return null;

        return new double[3, 3]
        {
            { h[0], h[1], h[2] },
            { h[3], h[4], h[5] },
            { h[6], h[7], 1.0 },
        };
    }

    public static (double X, double Y) Apply(double[,] h, double x, double y)
    {
        var denom = h[2, 0] * x + h[2, 1] * y + h[2, 2];
        if (Math.Abs(denom) < 1e-9) denom = 1e-9;
        var px = (h[0, 0] * x + h[0, 1] * y + h[0, 2]) / denom;
        var py = (h[1, 0] * x + h[1, 1] * y + h[1, 2]) / denom;
        return (px, py);
    }

    /// <summary>Gaussian elimination with partial pivoting. Returns null if the matrix is singular.</summary>
    private static double[]? SolveLinearSystem(double[,] a, double[] b)
    {
        const int n = 8;
        var m = (double[,])a.Clone();
        var v = (double[])b.Clone();

        for (var col = 0; col < n; col++)
        {
            var pivotRow = col;
            var maxAbs = Math.Abs(m[col, col]);
            for (var r = col + 1; r < n; r++)
            {
                if (Math.Abs(m[r, col]) > maxAbs)
                {
                    maxAbs = Math.Abs(m[r, col]);
                    pivotRow = r;
                }
            }
            if (maxAbs < 1e-10) return null;

            if (pivotRow != col)
            {
                for (var c = 0; c < n; c++) (m[col, c], m[pivotRow, c]) = (m[pivotRow, c], m[col, c]);
                (v[col], v[pivotRow]) = (v[pivotRow], v[col]);
            }

            for (var r = 0; r < n; r++)
            {
                if (r == col) continue;
                var factor = m[r, col] / m[col, col];
                for (var c = col; c < n; c++)
                {
                    m[r, c] -= factor * m[col, c];
                }
                v[r] -= factor * v[col];
            }
        }

        var result = new double[n];
        for (var i = 0; i < n; i++)
        {
            result[i] = v[i] / m[i, i];
        }
        return result;
    }
}
