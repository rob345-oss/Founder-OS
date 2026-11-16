"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmailComposer } from "@/components/crm/email/EmailComposer";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchEmailLabels, saveEmailTemplateApi } from "@/lib/crm/email-client-api";
import type { CrmEmailLabel } from "@/lib/crm/email/types";

export default function NewEmailTemplatePage() {
  const { token } = useCrmSession();
  const router = useRouter();
  const [labels, setLabels] = useState<CrmEmailLabel[]>([]);

  useEffect(() => {
    if (!token) return;
    void fetchEmailLabels(token).then(setLabels);
  }, [token]);

  const onSave = useCallback(
    async (payload: {
      name: string;
      subject: string;
      previewText: string;
      locale: "en" | "es";
      fromName: string;
      blocks: import("@/lib/crm/email/types").EmailBlock[];
      labelIds: string[];
    }) => {
      if (!token) return;
      const saved = await saveEmailTemplateApi(token, { ...payload, communicationType: "promotional" });
      router.push(`/crm/email/templates/${saved.template.id}`);
    },
    [token, router],
  );

  return <EmailComposer labels={labels} onSave={onSave} />;
}