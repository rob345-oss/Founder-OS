"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmailComposer } from "@/components/crm/email/EmailComposer";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchEmailLabels, fetchEmailTemplate, saveEmailTemplateApi } from "@/lib/crm/email-client-api";
import type { CrmEmailLabel } from "@/lib/crm/email/types";

export default function EditEmailTemplatePage() {
  const { token } = useCrmSession();
  const params = useParams<{ id: string }>();
  const [labels, setLabels] = useState<CrmEmailLabel[]>([]);
  const [initial, setInitial] = useState<Parameters<typeof EmailComposer>[0]["initial"]>();

  useEffect(() => {
    if (!token || !params.id) return;
    void Promise.all([fetchEmailLabels(token), fetchEmailTemplate(token, params.id)]).then(([labelItems, data]) => {
      setLabels(labelItems);
      setInitial({
        name: data.template.name,
        subject: data.version?.subject ?? data.template.subjectDefault,
        previewText: data.version?.previewText ?? data.template.previewTextDefault,
        locale: data.template.locale,
        fromName: data.template.fromName,
        blocks: data.version?.blocks ?? [],
        labelIds: data.template.labelIds,
      });
    });
  }, [token, params.id]);

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
      await saveEmailTemplateApi(token, { ...payload, id: params.id, communicationType: "promotional" });
    },
    [token, params.id],
  );

  if (!initial) return <p className="text-sm text-[var(--studio-text-secondary)]">Loading template…</p>;
  return <EmailComposer labels={labels} initial={initial} onSave={onSave} />;
}