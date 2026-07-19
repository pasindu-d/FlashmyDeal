export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  joinedDate: string;
  verifiedStatus: boolean;
  phone: string;
  listingRefs: string[];
  password?: string;
  otpCode?: string;
  verifiedDate?: string;
}

export interface ProductListing {
  id: string;
  title: string;
  price: number;
  originalPrice?: number; // to track and display "Flash Deal" price drops
  currency: string;
  category: string;
  condition: 'Brand New' | 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'For Parts';
  location: string;
  description: string;
  tags: string[];
  timestamp: number;
  sellerId: string;
  sellerName?: string;
  status: 'active' | 'sold' | 'inactive';
  images: string[]; // URLs or base64 paths
  phone: string;
  imageErrors?: string[]; // debugging info for image uploads
}

export interface GlobalRegistry {
  listings: ProductListing[];
}

export const CATEGORIES = [
  'Electronics',
  'Vehicles',
  'Property',
  'Home & Garden',
  'Fashion & Beauty',
  'Hobby, Sport & Kids',
  'Business & Industry',
  'Services',
  'Jobs',
  'Education',
  'Other'
] as const;

export const LOCATIONS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Moneragala',
  'Ratnapura',
  'Kegalle'
] as const;
