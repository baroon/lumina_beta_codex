using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptMarketConfiguration : IEntityTypeConfiguration<PromptMarket>
{
    public void Configure(EntityTypeBuilder<PromptMarket> builder)
    {
        builder.ToTable("prompt_markets");
        builder.HasKey(x => new { x.PromptId, x.MarketId });
        builder.Property(x => x.PromptId).HasColumnName("prompt_id");
        builder.Property(x => x.MarketId).HasColumnName("market_id");
        builder.HasIndex(x => x.MarketId);

        builder.HasOne<Market>()
            .WithMany()
            .HasForeignKey(x => x.MarketId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
