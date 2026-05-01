"use client";

import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { productLinks } from "@/config/navigation";

export function ContactForm() {
  const t = useScopedI18n("components.contactForm");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    product: "",
    company: "",
    role: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const subject = `${t("form.emailSubject")}: ${formData.product || t("form.fields.productPlaceholder")}`;
    const body = `
${t("form.fields.name")}: ${formData.name}
${t("form.fields.email")}: ${formData.email}
${t("form.fields.product")}: ${formData.product}
${t("form.fields.company")}: ${formData.company}
${t("form.fields.role")}: ${formData.role}

${t("form.fields.message")}:
${formData.message}
        `.trim();

    window.location.href = `mailto:contact@readingadvantage.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            {t("form.fields.name")}
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            {t("form.fields.email")}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium mb-2">
            {t("form.fields.company")}
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-2">
            {t("form.fields.role")}
          </label>
          <input
            type="text"
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
            placeholder={t("form.fields.rolePlaceholder")}
          />
        </div>

        <div>
          <label htmlFor="product" className="block text-sm font-medium mb-2">
            {t("form.fields.product")}
          </label>
          <select
            id="product"
            name="product"
            value={formData.product}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">{t("form.fields.productPlaceholder")}</option>
            {productLinks.map((product) => (
              <option key={product.href} value={product.label}>
                {product.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            {t("form.fields.message")}
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <Button type="submit" className="w-full">
          {t("form.button")}
        </Button>
      </form>
    </Card>
  );
}
