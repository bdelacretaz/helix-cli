/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

const nock = require('nock');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('hlx publish --remote (default)', () => {
  let RemotePublishCommand;
  let writeDictItem;
  let purgeAll;

  beforeEach('Setting up Fake Server', function bef() {
    this.timeout(5000);
    writeDictItem = sinon.fake.resolves(true);
    purgeAll = sinon.fake.resolves(true);

    RemotePublishCommand = proxyquire('../src/remotepublish.cmd', {
      '@adobe/fastly-native-promises': () => ({
        transact: fn => fn(3),
        writeDictItem,
        purgeAll,
      }),
    });

    // ensure to reset nock to avoid conflicts with PollyJS
    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  it('publishing makes HTTP requests', async () => {
    const scope = nock('https://adobeioruntime.net')
      .post('/api/v1/web/helix/default/publish')
      .reply(200, {})
      .post('/api/v1/web/helix/default/addlogger')
      .reply(200, {});

    const remote = await new RemotePublishCommand()
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/default/publish')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withFilter()
      .withDryRun(false);
    await remote.run();

    sinon.assert.calledTwice(writeDictItem);
    sinon.assert.calledOnce(purgeAll);

    scope.done();
  });

  it('publishing stops of no strains with package info', async () => {
    const remote = await new RemotePublishCommand()
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/default/publish')
      .withConfigFile(path.resolve(__dirname, 'fixtures/non-deployed.yaml'))
      .withDryRun(false);
    await remote.run();

    sinon.assert.notCalled(writeDictItem);
    sinon.assert.notCalled(purgeAll);
  });

  afterEach(() => {
    nock.restore();
  });
});
