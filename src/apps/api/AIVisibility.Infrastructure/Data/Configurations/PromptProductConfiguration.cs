using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptProductConfiguration : IEntityTypeConfiguration<PromptProduct>
{
    public void Configure(EntityTypeBuilder<PromptProduct> builder)
    {
        builder.ToTable("prompt_products");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PromptId).HasColumnName("prompt_id");
        builder.Property(x => x.ProductId).HasColumnName("product_id");
        builder.HasIndex(x => x.PromptId);
    }
}
