CREATE TABLE "primary_article_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"short_id" text NOT NULL,
	"node_id" text NOT NULL,
	"role" text NOT NULL,
	"graph_release" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_article_objectives_unique" UNIQUE("article_id","short_id","role")
);
--> statement-breakpoint
CREATE TABLE "primary_article_word_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"word" text NOT NULL,
	"pos" text NOT NULL,
	"node_id" text NOT NULL,
	"role" text NOT NULL,
	"graph_release" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_article_word_nodes_unique" UNIQUE("article_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "primary_question_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"question_type" text NOT NULL,
	"short_id" text NOT NULL,
	"node_id" text NOT NULL,
	"graph_release" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_question_objectives_unique" UNIQUE("question_id","question_type","short_id")
);
--> statement-breakpoint
ALTER TABLE "primary_article_objectives" ADD CONSTRAINT "primary_article_objectives_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_article_word_nodes" ADD CONSTRAINT "primary_article_word_nodes_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_question_objectives" ADD CONSTRAINT "primary_question_objectives_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "primary_article_objectives_node_idx" ON "primary_article_objectives" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "primary_article_word_nodes_node_idx" ON "primary_article_word_nodes" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "primary_question_objectives_article_idx" ON "primary_question_objectives" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "primary_question_objectives_node_idx" ON "primary_question_objectives" USING btree ("node_id");