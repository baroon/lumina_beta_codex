namespace AIVisibility.Infrastructure.Crawling;

public enum PageCategory
{
    Homepage,
    About,
    Product,
    Pricing,
    FAQ,
    Contact,
    Blog,
    Other
}

public static class PagePriorityClassifier
{
    private static readonly Dictionary<PageCategory, string[]> Patterns = new()
    {
        [PageCategory.About] = new[] { "/about", "/company", "/who-we-are", "/our-story", "/team" },
        [PageCategory.Product] = new[] { "/product", "/service", "/solution", "/feature", "/platform", "/offering" },
        [PageCategory.Pricing] = new[] { "/pricing", "/plans", "/packages", "/cost" },
        [PageCategory.FAQ] = new[] { "/faq", "/help", "/support", "/questions" },
        [PageCategory.Contact] = new[] { "/contact", "/get-in-touch", "/reach-us" },
        [PageCategory.Blog] = new[] { "/blog", "/news", "/articles", "/insights", "/resources" }
    };

    private static readonly Dictionary<PageCategory, int> PriorityScores = new()
    {
        [PageCategory.Homepage] = 100,
        [PageCategory.About] = 90,
        [PageCategory.Product] = 85,
        [PageCategory.Pricing] = 80,
        [PageCategory.FAQ] = 60,
        [PageCategory.Contact] = 40,
        [PageCategory.Blog] = 30,
        [PageCategory.Other] = 10
    };

    public static PageCategory Classify(string url)
    {
        var path = new Uri(url).AbsolutePath.ToLowerInvariant();
        if (path == "/" || path == "") return PageCategory.Homepage;

        foreach (var (category, patterns) in Patterns)
        {
            if (patterns.Any(p => path.Contains(p)))
                return category;
        }

        return PageCategory.Other;
    }

    public static int GetPriority(string url) => PriorityScores[Classify(url)];
}
