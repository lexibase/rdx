export type VersionMeta = {
  label: string;
  icon: "bird" | "packageOpen" | "archive";
};

export function getParsedVersions(versionsRaw: {
  active: string[];
  archived: string[];
}): {
  canary: VersionMeta;
  active: VersionMeta[];
  archived: VersionMeta[];
} {
  const parsedActive = versionsRaw.active.map(
    (label): VersionMeta => ({
      label,
      icon: "packageOpen",
    }),
  );

  const parsedArchived = versionsRaw.archived.map(
    (label): VersionMeta => ({
      label,
      icon: "archive",
    }),
  );

  const current = parsedActive[0] ?? { label: "0.0.0", icon: "packageOpen" };
  const restActive = parsedActive.slice(1);

  return {
    canary: { label: "canary", icon: "bird" },
    active: [current, ...restActive],
    archived: parsedArchived,
  };
}
