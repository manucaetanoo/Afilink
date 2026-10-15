ALTER TABLE "Product" ADD COLUMN "category" VARCHAR(40) NOT NULL DEFAULT 'otros';

-- Initial classification by title. Sellers can review or change it in the editor.
UPDATE "Product" SET "category" = CASE
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(programaci|tecnolog|software|javascript|python|inteligencia artificial|desarrollo web|informatica|excel|computacion|ciberseguridad)' THEN 'tecnologia'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(electric|carpinter|plomer|soldadur|mecanic|refrigeracion|albanil|costura|peluquer|barber|manicur)' THEN 'oficios'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(marketing|publicidad|redes sociales|community manager|copywriting|seo|instagram)' THEN 'marketing'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(finanzas|inversion|trading|contabilidad|criptomoneda|presupuesto)' THEN 'finanzas'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(negocio|emprend|ventas|ecommerce|e-commerce|administracion|liderazgo)' THEN 'negocios'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(diseno|fotografia|ilustracion|photoshop|canva|dibujo|musica|guitarra|piano|edicion de video)' THEN 'diseno'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(salud|bienestar|yoga|fitness|nutricion|meditacion|entrenamiento|pilates)' THEN 'bienestar'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(idioma|ingles|portugues|frances|aleman|italiano|japones)' THEN 'idiomas'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(cocina|gastronomia|reposteria|panaderia|pasteleria|barista)' THEN 'gastronomia'
  WHEN translate(lower("name"), 'áéíóúüñ', 'aeiouun') ~ '(desarrollo personal|productividad|autoestima|habitos|oratoria|gestion del tiempo)' THEN 'desarrollo-personal'
  ELSE 'otros'
END;

CREATE INDEX "idx_product_active_category_created" ON "Product"("isActive", "category", "createdAt");
