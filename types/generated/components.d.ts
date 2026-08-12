import type { Schema, Struct } from '@strapi/strapi';

export interface CompetitionBatchLimits extends Struct.ComponentSchema {
  collectionName: 'components_competition_batch_limits';
  info: {
    displayName: 'batchLimits';
  };
  attributes: {
    assigned: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    batch: Schema.Attribute.Relation<
      'oneToOne',
      'api::competition-batch.competition-batch'
    >;
    limit: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<1>;
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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'competition.batch-limits': CompetitionBatchLimits;
      'place.address': PlaceAddress;
      'place.geolocation': PlaceGeolocation;
    }
  }
}
