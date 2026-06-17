import type { Schema, Struct } from '@strapi/strapi';

export interface CompetitionEvaluation extends Struct.ComponentSchema {
  collectionName: 'components_competition_evaluations';
  info: {
    displayName: 'evaluation';
    icon: 'feather';
  };
  attributes: {
    comments: Schema.Attribute.Text & Schema.Attribute.Required;
    criteria: Schema.Attribute.String;
    value: Schema.Attribute.Integer;
  };
}

export interface PlaceAddress extends Struct.ComponentSchema {
  collectionName: 'components_place_addresses';
  info: {
    displayName: 'address';
    icon: 'house';
  };
  attributes: {
    description: Schema.Attribute.String;
    geolocation: Schema.Attribute.Component<'place.geolocation', false>;
    zipCode: Schema.Attribute.String;
  };
}

export interface PlaceGeolocation extends Struct.ComponentSchema {
  collectionName: 'components_place_geolocations';
  info: {
    displayName: 'geolocation';
    icon: 'pinMap';
  };
  attributes: {
    latitude: Schema.Attribute.Float;
    longitude: Schema.Attribute.Float;
  };
}

export interface SocialNetwork extends Struct.ComponentSchema {
  collectionName: 'components_social_networks';
  info: {
    displayName: 'network';
    icon: 'earth';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    type: Schema.Attribute.Enumeration<
      [
        'email',
        'instagram',
        'puttyandpaint',
        'facebook',
        'pinterest',
        'twitter',
        'tiktok',
        'artstation',
        'web',
        'linktree',
        'other',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'other'>;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'competition.evaluation': CompetitionEvaluation;
      'place.address': PlaceAddress;
      'place.geolocation': PlaceGeolocation;
      'social.network': SocialNetwork;
    }
  }
}
