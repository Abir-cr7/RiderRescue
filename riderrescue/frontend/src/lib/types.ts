export type Role = 'member' | 'provider' | 'admin';
export type UserStatus = 'active' | 'pending' | 'restricted';
export type ServiceType = 'fuel' | 'rescue' | 'workshop';
export type RequestStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: string; user_id: string; name: string; email: string; phone: string;
  role: Role; status: UserStatus;
}

export interface FuelDetails { grades: string[]; price_per_liter: number; delivery_radius_km: number }
export interface RescueDetails { hotline: string; vehicle_types: string[]; response_capacity: number }
export interface WorkshopDetails { address: string; lat: number; lng: number; services: string[]; base_rate: number }
export type ServiceDetails = Partial<FuelDetails & RescueDetails & WorkshopDetails>;

export interface ProviderProfile {
  id: string; shop_name: string; service_type: ServiceType;
  service_details: ServiceDetails; average_rating: number; is_approved: boolean;
}

export interface ProviderListing {
  id: string; shop_name: string; provider_name: string; service_type: ServiceType;
  service_details: ServiceDetails; average_rating: number; rating_count: number; distance_km: number | null;
}

export interface MemberRequest {
  id: string; service_type: ServiceType; status: RequestStatus; shop_name: string;
  details: Record<string, any>; total_amount: number | null; rating: number | null; created_at: string;
}

export interface IncomingRequest {
  id: string; service_type: ServiceType; status: RequestStatus; member_name: string; member_phone: string;
  details: Record<string, any>; total_amount: number | null; rating: number | null; created_at: string;
}

export interface PendingProvider {
  id: string; shop_name: string; trade_license_number: string; service_type: ServiceType;
  provider_name: string; user_id: string; email: string; phone: string; nid_number: string; created_at: string;
}

export interface AdminStats {
  active_members: number;
  verified_providers: Record<ServiceType, number>;
  total_revenue: number;
  average_rating: Record<ServiceType, number | null>;
}

export interface AdminUser { id: string; user_id: string; name: string; email: string; phone: string; role: Role; status: UserStatus; created_at: string }

export const SERVICE_LABEL: Record<ServiceType, string> = {
  fuel: 'Fuel Service', rescue: 'Emergency Rescue Team', workshop: 'Mechanical Workshop',
};
