type PartnerStageRef = {
  id: string;
  current_stage_id: string;
};

type PackageStageRef = {
  id: string;
  partner_id: string;
  stage_gate_id: string;
  package_version: number;
  status: string;
};

type StatusInput = { status: string } | string | null | undefined;

export function getCurrentPackagesByPartner<T extends PackageStageRef>(
  partners: PartnerStageRef[],
  packages: T[],
) {
  const partnerStage = new Map(
    partners.map((partner) => [partner.id, partner.current_stage_id]),
  );
  const map = new Map<string, T>();

  for (const stagePackage of packages) {
    if (partnerStage.get(stagePackage.partner_id) !== stagePackage.stage_gate_id) {
      continue;
    }

    const existing = map.get(stagePackage.partner_id);
    if (!existing || stagePackage.package_version > existing.package_version) {
      map.set(stagePackage.partner_id, stagePackage);
    }
  }

  return map;
}

export function getCurrentPackageForStage<T extends { stage_gate_id: string; package_version: number }>(
  packages: T[],
  currentStageId: string,
) {
  return (
    packages
      .filter((stagePackage) => stagePackage.stage_gate_id === currentStageId)
      .sort((a, b) => b.package_version - a.package_version)[0] ?? null
  );
}

export function getNextStepDue(
  packageInput: StatusInput,
  approvalInput?: StatusInput,
) {
  const packageStatus = resolveStatus(packageInput, "not_created");
  const approvalStatus = resolveStatus(approvalInput, "");

  if (["submitted", "in_review"].includes(approvalStatus)) {
    return "Now: review approval";
  }

  if (packageStatus === "not_created") {
    return "Now: create package";
  }

  if (["draft", "in_progress", "rework_required"].includes(packageStatus)) {
    return "Now: complete package";
  }

  if (packageStatus === "ready_for_review") {
    return "Now: submit package";
  }

  return "Not scheduled";
}

function resolveStatus(input: StatusInput, emptyDefault: string) {
  if (input === null || input === undefined) {
    return emptyDefault;
  }

  if (typeof input === "string") {
    return input;
  }

  return input.status;
}
