using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptMarketConfiguration : IEntityTypeConfiguration<PromptMarket>
{
    public void Configure(EntityTypeBuilder<PromptMarket> builder)
    {
        builder.ToTable("prompt_markets");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PromptId).HasColumnName("prompt_id");
        builder.Property(x => x.MarketId).HasColumnName("market_id");
        builder.HasIndex(x => x.PromptId);
    }
}
