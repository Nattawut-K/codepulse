/* Code Pulse: a real-time code coverage tool, for more information, see <http://code-pulse.com/>
 *
 * Copyright (C) 2014-2017 Code Dx, Inc. <https://codedx.com/>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.codedx.codepulse.agent.common.message;

import java.io.DataOutputStream;
import java.io.IOException;

public class MessageProtocolV2 extends MessageProtocolV1
{
    @Override
    public byte protocolVersion()
    {
        return 2;
    }

    @Override
    public void writeConfiguration(DataOutputStream out, String configJson) throws IOException
    {
        out.writeByte(MessageConstantsV1.MsgConfiguration);
        out.writeUTF(configJson);
    }
}