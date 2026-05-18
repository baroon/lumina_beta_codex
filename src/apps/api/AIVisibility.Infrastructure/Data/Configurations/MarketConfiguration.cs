using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MarketConfiguration : IEntityTypeConfiguration<Market>
{
    public void Configure(EntityTypeBuilder<Market> builder)
    {
        builder.ToTable("markets");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.BrandId).HasColumnName("brand_id");
        builder.Property(m => m.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(m => m.MarketType).HasColumnName("market_type").HasConversion<string>().HasMaxLength(50);
        builder.Property(m => m.CountryCode).HasColumnName("country_code").HasMaxLength(10);
        builder.Property(m => m.Region).HasColumnName("region").HasMaxLength(200);
        builder.Property(m => m.City).HasColumnName("city").HasMaxLength(200);
        builder.Property(m => m.LanguageCode).HasColumnName("language_code").HasMaxLength(10);
        builder.Property(m => m.CurrencyCode).HasColumnName("currency_code").HasMaxLength(10);
        builder.Property(m => m.IsCustom).HasColumnName("is_custom");
        builder.Property(m => m.Confidence).HasColumnName("confidence");
        builder.Property(m => m.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(m => m.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);

        builder.HasIndex(m => m.BrandId);
    }
}
