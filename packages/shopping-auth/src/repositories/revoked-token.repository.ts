import {RedisDataSource} from '../datasources';
import {DefaultKeyValueRepository} from '@loopback/repository';
import {inject} from '@loopback/core';
import {RevokedToken} from '../models';

export class RevokedTokenRepository extends DefaultKeyValueRepository<RevokedToken> {
  constructor(@inject('datasources.redis') dataSource: RedisDataSource) {
    super(RevokedToken, dataSource);
  }
}
