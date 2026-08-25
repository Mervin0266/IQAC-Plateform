export interface LineageEvent {
  domainGroup: string;
  parentDepartment: string;
  childDepartment: string;
  splitAcademicYear: string;
  markerLabel: string;
}

export interface TimelineDataPoint {
  academicYear: string;
  isSplitYear: boolean;
  cse: {
    placed: number;
    publications: number;
  };
  adse: {
    placed: number;
    publications: number;
  };
  combinedDomain: {
    placed: number;
    publications: number;
  };
}

export interface LineageAnalyticsResponse {
  success: boolean;
  lineageEvent: LineageEvent;
  timeline: TimelineDataPoint[];
}
